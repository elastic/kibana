/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';

import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { TextExpansionInference, FormattedTextExpansionResponse } from '.';

export const getTextExpansionOutputComponent = (inferrer: TextExpansionInference) => (
  <TextExpansionOutput inferrer={inferrer} />
);

export const TextExpansionOutput: FC<{
  inferrer: TextExpansionInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result
        .sort((a, b) => b.response.score - a.response.score)
        .map(({ response, inputText }) => (
          <>
            <Token response={response} />
            <EuiHorizontalRule />
          </>
        ))}
    </>
  );
};

export const Token: FC<{
  response: FormattedTextExpansionResponse;
}> = ({ response }) => {
  const tokens = response.adjustedTokenWeights
    .filter(({ value }) => value > 0)
    .map(({ token, value }) => ({ token, value: roundToDecimalPlace(value, 3) }));

  const { euiColorMediumShade } = euiThemeVars;

  const color = response.score === 0 ? euiColorMediumShade : 'success';
  return (
    <>
      {response.text !== undefined ? (
        <>
          <EuiStat
            title={roundToDecimalPlace(response.score, 3)}
            textAlign="left"
            titleColor={color}
            description={null}
            // description={
            //   <EuiTextColor color={color}>
            //     <span>
            //       <EuiIcon type="visGauge" color={color} /> Score
            //     </span>
            //   </EuiTextColor>
            // }
          />
          <span css={response.score === 0 ? { color } : {}}>{response.text}</span>
          <EuiSpacer size="s" />
        </>
      ) : null}

      {tokens.length > 0 ? (
        <EuiAccordion
          id={`textExpansion_${response.text}`}
          buttonContent={i18n.translate(
            'xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.tokens',
            {
              defaultMessage: 'Tokens',
            }
          )}
        >
          <>
            <EuiInMemoryTable
              items={tokens}
              columns={[
                {
                  field: 'token',
                  name: i18n.translate(
                    'xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.token',
                    {
                      defaultMessage: 'Token',
                    }
                  ),
                },
                {
                  field: 'value',
                  name: i18n.translate(
                    'xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.weight',
                    {
                      defaultMessage: 'Weight',
                    }
                  ),
                },
              ]}
              pagination={{
                pageSizeOptions: [10, 25, 0],
              }}
            />
          </>
        </EuiAccordion>
      ) : null}
    </>
  );
};
