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

export type InferenceType =
  | SupportedPytorchTasksType
  | keyof estypes.AggregationsInferenceConfigContainer;

const DEFAULT_INPUT_FIELD = 'text_field';

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

export abstract class InferenceBase<TInferResponse> {
  protected abstract inferenceType: InferenceType;
  protected readonly inputField: string;
  public inputText$ = new BehaviorSubject<string>('');
  public inferenceResult$ = new BehaviorSubject<TInferResponse | null>(null);
  public inferenceError$ = new BehaviorSubject<MLHttpFetchError | null>(null);
  public runningState$ = new BehaviorSubject<RUNNING_STATE>(RUNNING_STATE.STOPPED);

  constructor(
    protected trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    protected model: estypes.MlTrainedModelConfig
  ) {
    this.inputField = model.input?.field_names[0] ?? DEFAULT_INPUT_FIELD;
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

  protected abstract getInputComponent(): JSX.Element;
  protected abstract getOutputComponent(): JSX.Element;

  protected abstract infer(): Promise<TInferResponse>;

  protected getInferenceConfig(): estypes.MlInferenceConfigCreateContainer[keyof estypes.MlInferenceConfigCreateContainer] {
    return this.model.inference_config[
      this.inferenceType as keyof estypes.MlInferenceConfigCreateContainer
    ];
  }

  protected getNumTopClassesConfig(defaultOverride = 5) {
    const options: estypes.MlInferenceConfigCreateContainer[keyof estypes.MlInferenceConfigCreateContainer] =
      this.getInferenceConfig();

    if (options && 'num_top_classes' in options && (options?.num_top_classes ?? 0 > 0)) {
      return {};
    }

    return {
      inference_config: {
        [this.inferenceType]: {
          num_top_classes: defaultOverride,
        },
      },
    };
  }
}
