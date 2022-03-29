/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceBase } from '../inference_base';

export type FormattedLangIdentResp = Array<{
  className: string;
  classProbability: number;
  classScore: number;
}>;

export class LangIdentInference extends InferenceBase {
  public async infer(
    inputText: string
  ): Promise<{ response: FormattedLangIdentResp; rawResponse: estypes.IngestSimulateResponse }> {
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

      return {
        response: topClasses.map((t: any) => ({
          className: t.class_name,
          classProbability: t.class_probability,
          classScore: t.class_score,
        })),
        rawResponse: resp,
      };
    }
    return { response: [], rawResponse: resp };
  }
}
