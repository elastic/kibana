/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { MLHttpFetchError } from '../../../../../../common/util/errors';
import { SupportedPytorchTasksType } from '../../../../../../common/constants/trained_models';
import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import { getInferenceInfoComponent } from './inference_info';

export type InferenceType =
  | SupportedPytorchTasksType
  | keyof estypes.AggregationsInferenceConfigContainer;

const DEFAULT_INPUT_FIELD = 'text_field';
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
  protected inputField: string;
  protected readonly modelInputField: string;
  public inputText$ = new BehaviorSubject<string[]>([]);
  public inferenceResult$ = new BehaviorSubject<TInferResponse[] | null>(null);
  public inferenceError$ = new BehaviorSubject<MLHttpFetchError | null>(null);
  public runningState$ = new BehaviorSubject<RUNNING_STATE>(RUNNING_STATE.STOPPED);
  protected readonly info: string[] = [];

  constructor(
    protected readonly trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    protected readonly model: estypes.MlTrainedModelConfig,
    protected readonly inputType: INPUT_TYPE
  ) {
    this.modelInputField = model.input?.field_names[0] ?? DEFAULT_INPUT_FIELD;
    this.inputField = this.modelInputField;
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

  public setInputField(field: string | undefined) {
    this.inputField = field === undefined ? this.modelInputField : field;
  }

  protected getInputText() {
    return this.inputText$.getValue()[0];
  }

  protected abstract getInputComponent(): JSX.Element | null;
  protected abstract getOutputComponent(): JSX.Element;

  public async infer() {
    return this.inputType === INPUT_TYPE.TEXT ? this.inferText() : this.inferIndex();
  }

  protected abstract inferText(): Promise<TInferResponse[]>;
  protected abstract inferIndex(): Promise<TInferResponse[]>;

  public getPipeline(): estypes.IngestPipeline {
    return {
      processors: this.getProcessors(),
    };
  }

  protected getBasicProcessors(
    inferenceConfigOverrides?: Array<Record<string, any>>
  ): estypes.IngestProcessorContainer[] {
    const processor: estypes.IngestProcessorContainer = {
      inference: {
        model_id: this.model.model_id,
        target_field: this.inferenceType,
        field_map: {
          [this.inputField]: this.modelInputField,
        },
        ...(inferenceConfigOverrides?.length
          ? { ...this.getInferenceConfig(inferenceConfigOverrides) }
          : {}),
      },
    };

    return [processor];
  }

  protected getInferenceConfig(inferenceConfigOverrides: Array<Record<string, any>>): {
    inference_config: estypes.MlInferenceConfigCreateContainer;
  } {
    return {
      inference_config: {
        [this.inferenceType as keyof estypes.MlInferenceConfigCreateContainer]: Object.assign(
          {},
          {},
          ...inferenceConfigOverrides
        ),
      },
    };
  }

  protected abstract getProcessors(): estypes.IngestProcessorContainer[];

  protected getPipelineDocs() {
    return this.inputText$.getValue().map((v) => ({
      _source: {
        [this.inputField]: v,
      },
    }));
  }

  private getDefaultInferenceConfig(): estypes.MlInferenceConfigCreateContainer[keyof estypes.MlInferenceConfigCreateContainer] {
    return this.model.inference_config[
      this.inferenceType as keyof estypes.MlInferenceConfigCreateContainer
    ];
  }

  protected getNumTopClassesConfig(defaultOverride = 5) {
    const options: estypes.MlInferenceConfigCreateContainer[keyof estypes.MlInferenceConfigCreateContainer] =
      this.getDefaultInferenceConfig();

    if (options && 'num_top_classes' in options && (options?.num_top_classes ?? 0 > 0)) {
      return {};
    }

    return {
      num_top_classes: defaultOverride,
    };
  }
}
