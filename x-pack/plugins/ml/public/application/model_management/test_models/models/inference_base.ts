/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';

import { map } from 'rxjs';
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MLHttpFetchError } from '@kbn/ml-error-utils';
import type { trainedModelsApiProvider } from '../../../services/ml_api_service/trained_models';
import { getInferenceInfoComponent } from './inference_info';

export type InferenceType =
  | SupportedPytorchTasksType
  | keyof estypes.AggregationsInferenceConfigContainer;

export type InferenceOptions =
  | estypes.MlRegressionInferenceOptions
  | estypes.MlClassificationInferenceOptions
  | estypes.MlTextClassificationInferenceOptions
  | estypes.MlZeroShotClassificationInferenceOptions
  | estypes.MlFillMaskInferenceOptions
  | estypes.MlNerInferenceOptions
  | estypes.MlPassThroughInferenceOptions
  | estypes.MlTextEmbeddingInferenceOptions
  | estypes.MlQuestionAnsweringInferenceUpdateOptions;

export const DEFAULT_INPUT_FIELD = 'text_field';
export const DEFAULT_INFERENCE_TIME_OUT = '30s';

export type FormattedNerResponse = Array<{
  value: string;
  entity: estypes.MlTrainedModelEntities | null;
}>;

export interface InferResponse<T, U> {
  inputText: string;
  response: T;
  rawResponse: U;
}

export enum RUNNING_STATE {
  STOPPED,
  RUNNING,
  FINISHED,
  FINISHED_WITH_ERRORS,
}

export enum INPUT_TYPE {
  TEXT,
  INDEX,
}

export abstract class InferenceBase<TInferResponse> {
  protected abstract readonly inferenceType: InferenceType;
  protected abstract readonly inferenceTypeLabel: string;
  protected readonly modelInputField: string;

  protected _deploymentId: string | null = null;

  protected inputText$ = new BehaviorSubject<string[]>([]);
  private inputField$ = new BehaviorSubject<string>('');
  private inferenceResult$ = new BehaviorSubject<TInferResponse[] | null>(null);
  private inferenceError$ = new BehaviorSubject<MLHttpFetchError | null>(null);
  private runningState$ = new BehaviorSubject<RUNNING_STATE>(RUNNING_STATE.STOPPED);
  private isValid$ = new BehaviorSubject<boolean>(false);
  private pipeline$ = new BehaviorSubject<estypes.IngestPipeline>({});
  private supportedFieldTypes: ES_FIELD_TYPES[] = [ES_FIELD_TYPES.TEXT];
  private selectedDataViewId: string | undefined;

  protected readonly info: string[] = [];
  public switchToCreationMode?: () => void;

  private subscriptions$: Subscription = new Subscription();

  constructor(
    protected readonly trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    protected readonly model: estypes.MlTrainedModelConfig,
    protected readonly inputType: INPUT_TYPE,
    protected readonly deploymentId: string
  ) {
    this.modelInputField = model.input?.field_names[0] ?? DEFAULT_INPUT_FIELD;
    this.inputField$.next(this.modelInputField);
  }

  public setSwitchtoCreationMode(callback: () => void) {
    this.switchToCreationMode = callback;
  }

  public destroy() {
    this.subscriptions$.unsubscribe();
    this.pipeline$.unsubscribe();
  }

  protected initialize(
    additionalValidators?: Array<Observable<boolean>>,
    additionalChanges?: Array<Observable<unknown>>
  ) {
    this.initializeValidators(additionalValidators);
    this.initializePipeline(additionalChanges);
  }

  private initializeValidators(additionalValidators?: Array<Observable<boolean>>) {
    const validators$: Array<Observable<boolean>> = [
      this.inputText$.pipe(map((inputText) => inputText.some((t) => t !== ''))),
      ...(additionalValidators ? additionalValidators : []),
    ];

    this.subscriptions$.add(
      combineLatest(validators$)
        .pipe(
          map((validationResults) => {
            return validationResults.every((v) => !!v);
          })
        )
        .subscribe(this.isValid$)
    );
  }

  private initializePipeline(additionalChanges?: Array<Observable<unknown>>) {
    const formObservables$: Array<Observable<unknown>> = [
      this.inputField$.asObservable(),
      ...(additionalChanges ? additionalChanges : []),
    ];

    this.subscriptions$.add(
      combineLatest(formObservables$).subscribe(() => {
        this.pipeline$.next(this.generatePipeline());
      })
    );
  }

  public setStopped() {
    this.inferenceError$.next(null);
    this.runningState$.next(RUNNING_STATE.STOPPED);
  }
  public setRunning() {
    this.inferenceError$.next(null);
    this.runningState$.next(RUNNING_STATE.RUNNING);
  }

  public setFinished() {
    this.runningState$.next(RUNNING_STATE.FINISHED);
  }

  public setFinishedWithErrors(error: MLHttpFetchError) {
    this.inferenceError$.next(error);
    this.runningState$.next(RUNNING_STATE.FINISHED_WITH_ERRORS);
  }

  public getInfoComponent(): JSX.Element {
    return getInferenceInfoComponent(this.inferenceTypeLabel, this.info);
  }

  public getInputType() {
    return this.inputType;
  }

  public reset() {
    this.inputText$.next([]);
    this.inferenceResult$.next(null);
    this.inferenceError$.next(null);
    this.runningState$.next(RUNNING_STATE.STOPPED);
  }

  public setSelectedDataViewId(dataViewId: string) {
    // Data view selected for testing
    this.selectedDataViewId = dataViewId;
  }

  public getSelectedDataViewId() {
    return this.selectedDataViewId;
  }

  public setInputField(field: string | undefined) {
    // if the field is not set, change to be the same as the model input field
    this.inputField$.next(field === undefined ? this.modelInputField : field);
  }

  public getInputField() {
    return this.inputField$.getValue();
  }

  public getInputField$() {
    return this.inputField$.asObservable();
  }

  public setInputText(text: string[]) {
    this.inputText$.next(text);
  }

  public getInputText$() {
    return this.inputText$.asObservable();
  }

  public getInputText() {
    return this.inputText$.getValue();
  }

  public getInferenceResult$() {
    return this.inferenceResult$.asObservable();
  }

  public getInferenceResult() {
    return this.inferenceResult$.getValue();
  }

  public getInferenceError$() {
    return this.inferenceError$.asObservable();
  }

  public getInferenceError() {
    return this.inferenceError$.getValue();
  }

  public getRunningState$() {
    return this.runningState$.asObservable();
  }

  public getRunningState() {
    return this.runningState$.getValue();
  }

  public getIsValid$() {
    return this.isValid$.asObservable();
  }

  public getIsValid() {
    return this.isValid$.getValue();
  }

  protected abstract getInputComponent(): JSX.Element | null;
  protected abstract getOutputComponent(): JSX.Element;

  public async infer() {
    return this.inputType === INPUT_TYPE.TEXT ? this.inferText() : this.inferIndex();
  }

  protected abstract inferText(): Promise<TInferResponse[]>;
  protected abstract inferIndex(): Promise<TInferResponse[]>;

  public generatePipeline(): estypes.IngestPipeline {
    return {
      processors: this.getProcessors(),
    };
  }

  public getPipeline$() {
    return this.pipeline$.asObservable();
  }

  public getPipeline(): estypes.IngestPipeline {
    return this.pipeline$.getValue();
  }

  public getSupportedFieldTypes(): ES_FIELD_TYPES[] {
    return this.supportedFieldTypes;
  }

  protected getBasicProcessors(
    inferenceConfigOverrides?: InferenceOptions
  ): estypes.IngestProcessorContainer[] {
    const processor: estypes.IngestProcessorContainer = {
      inference: {
        model_id: this.deploymentId ?? this.model.model_id,
        target_field: this.inferenceType,
        field_map: {
          [this.inputField$.getValue()]: this.modelInputField,
        },
        ...(inferenceConfigOverrides && Object.keys(inferenceConfigOverrides).length
          ? { inference_config: this.getInferenceConfig(inferenceConfigOverrides) }
          : {}),
      },
    };

    return [processor];
  }

  protected getInferenceConfig(
    inferenceConfigOverrides: InferenceOptions
  ): estypes.MlInferenceConfigUpdateContainer {
    return {
      [this.inferenceType as keyof estypes.MlInferenceConfigUpdateContainer]: {
        ...inferenceConfigOverrides,
      },
    };
  }

  protected async runInfer<TRawInferResponse>(
    getInferenceConfig: () => estypes.MlInferenceConfigUpdateContainer | void,
    processResponse: (resp: TRawInferResponse, inputText: string) => TInferResponse
  ): Promise<TInferResponse[]> {
    try {
      this.setRunning();
      const inputText = this.inputText$.getValue()[0];
      const inferenceConfig = getInferenceConfig();

      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        this.deploymentId,
        {
          docs: this.getInferDocs(),
          ...(inferenceConfig ? { inference_config: inferenceConfig } : {}),
        },
        DEFAULT_INFERENCE_TIME_OUT
      )) as unknown as TRawInferResponse;

      const processedResponse = processResponse(resp, inputText);

      this.inferenceResult$.next([processedResponse]);
      this.setFinished();

      return [processedResponse];
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected async runPipelineSimulate(
    processResponse: (d: estypes.IngestSimulateDocumentSimulation) => TInferResponse
  ): Promise<TInferResponse[]> {
    try {
      this.setRunning();
      const { docs } = await this.trainedModelsApi.trainedModelPipelineSimulate(
        this.getPipeline(),
        this.getPipelineDocs()
      );
      const processedResponse = docs.map((d) => processResponse(this.getDocFromResponse(d)));
      this.inferenceResult$.next(processedResponse);
      this.setFinished();
      return processedResponse;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected abstract getProcessors(): estypes.IngestProcessorContainer[];

  protected getInferDocs() {
    return [{ [this.inputField$.getValue()]: this.inputText$.getValue()[0] }];
  }

  protected getPipelineDocs() {
    return this.inputText$.getValue().map((v) => ({
      _source: {
        [this.inputField$.getValue()]: v,
      },
    }));
  }

  private getDefaultInferenceConfig(): estypes.MlInferenceConfigUpdateContainer[keyof estypes.MlInferenceConfigUpdateContainer] {
    return this.model.inference_config![
      this.inferenceType as keyof estypes.MlInferenceConfigUpdateContainer
    ];
  }

  protected getNumTopClassesConfig(defaultOverride = 5) {
    const options: estypes.MlInferenceConfigUpdateContainer[keyof estypes.MlInferenceConfigUpdateContainer] =
      this.getDefaultInferenceConfig();

    if (options && 'num_top_classes' in options && (options?.num_top_classes ?? 0 > 0)) {
      return {};
    }

    return {
      num_top_classes: defaultOverride,
    };
  }

  // @ts-expect-error error does not exist in type
  protected getDocFromResponse({ doc, error }: estypes.IngestSimulatePipelineSimulation) {
    if (doc === undefined) {
      if (error) {
        this.setFinishedWithErrors(error);
        throw Error(error.reason);
      }

      throw Error(
        i18n.translate('xpack.ml.trainedModels.testModelsFlyout.pipelineSimulate.unknownError', {
          defaultMessage: 'Error simulating ingest pipeline',
        })
      );
    }
    return doc;
  }
}
