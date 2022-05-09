/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceBase, InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getLangIdentOutputComponent } from './lang_ident_output';

export type FormattedLangIdentResponse = Array<{
  className: string;
  classProbability: number;
  classScore: number;
}>;

export type LangIdentResponse = InferResponse<
  FormattedLangIdentResponse,
  estypes.IngestSimulateResponse
>;

export class LangIdentInference extends InferenceBase<LangIdentResponse> {
  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.value;
      const payload: estypes.IngestSimulateRequest['body'] = {
        pipeline: {
          processors: [
            {
              inference: {
                model_id: this.model.model_id,
                inference_config: {
                  // @ts-expect-error classification missing from type
                  classification: {
                    num_top_classes: 3,
                  },
                },
                field_mappings: {
                  contents: this.inputField,
                },
                target_field: '_ml.lang_ident',
              },
            },
          ],
        },
        docs: [
          {
            _source: {
              contents: inputText,
            },
          },
        ],
      };
      const resp = await this.trainedModelsApi.ingestPipelineSimulate(payload);
      if (resp.docs.length) {
        const topClasses = resp.docs[0].doc?._source._ml?.lang_ident?.top_classes ?? [];

        const r: LangIdentResponse = {
          response: topClasses.map((t: estypes.MlTopClassEntry) => ({
            className: t.class_name,
            classProbability: t.class_probability,
            classScore: t.class_score,
          })),
          rawResponse: resp,
          inputText,
        };
        this.inferenceResult$.next(r);
        this.setFinished();
        return r;
      }
      const r: LangIdentResponse = { response: [], rawResponse: resp, inputText };
      this.inferenceResult$.next(r);
      this.setFinished();
      return r;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  public getInputComponent(): JSX.Element {
    return getGeneralInputComponent(this);
  }

  public getOutputComponent(): JSX.Element {
    return getLangIdentOutputComponent(this);
  }
}
