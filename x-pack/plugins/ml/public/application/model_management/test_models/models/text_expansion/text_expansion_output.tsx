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
  EuiIcon,
  EuiInMemoryTable,
  EuiSpacer,
  EuiStat,
  EuiTextColor,
  EuiCallOut,
} from '@elastic/eui';

import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCurrentThemeVars } from '../../../../contexts/kibana';
import type { TextExpansionInference, FormattedTextExpansionResponse } from '.';

const MAX_TOKENS = 5;

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
      <EuiCallOut color="primary">
        <FormattedMessage
          id="xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.info"
          defaultMessage="The numbers below represent relevance scores for documents randomly selected from the index concerning the supplied query. Evaluating model recall is simpler when using a query related to the documents."
        />
      </EuiCallOut>

      <EuiSpacer size="m" />

      {result
        .sort((a, b) => b.response.score - a.response.score)
        .map(({ response, inputText }) => (
          <>
            <DocumentResult response={response} />
            <EuiHorizontalRule />
          </>
        ))}
    </>
  );
};

export const DocumentResult: FC<{
  response: FormattedTextExpansionResponse;
}> = ({ response }) => {
  const statInfo = useResultStatFormatting(response);

  return (
    <>
      {response.text !== undefined ? (
        <>
          <EuiStat
            title={roundToDecimalPlace(response.score, 3)}
            textAlign="left"
            titleColor={statInfo.color}
            description={
              <EuiTextColor color={statInfo.color}>
                <span>
                  {statInfo.icon !== null ? (
                    <EuiIcon type={statInfo.icon} color={statInfo.color} />
                  ) : null}
                  {statInfo.text}
                </span>
              </EuiTextColor>
            }
          />

          <EuiSpacer size="s" />
          <span css={{ color: statInfo.textColor }}>{response.text}</span>
          <EuiSpacer size="s" />
        </>
      ) : null}
    </>
  );
};

/*
 * Currently not used. Tokens could contain sensitive words, so need to be hidden from the user.
 * This may change in the future, in which case this function will be used.
 */
export const DocumentResultWithTokens: FC<{
  response: FormattedTextExpansionResponse;
}> = ({ response }) => {
  const tokens = response.adjustedTokenWeights
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_TOKENS)
    .map(({ token, value }) => ({ token, value: roundToDecimalPlace(value, 3) }));

  const statInfo = useResultStatFormatting(response);

  return (
    <>
      {response.text !== undefined ? (
        <>
          <EuiStat
            title={roundToDecimalPlace(response.score, 3)}
            textAlign="left"
            titleColor={statInfo.color}
            description={
              <EuiTextColor color={statInfo.color}>
                <span>
                  {statInfo.icon !== null ? (
                    <EuiIcon type={statInfo.icon} color={statInfo.color} />
                  ) : null}
                  {statInfo.text}
                </span>
              </EuiTextColor>
            }
          />

          <EuiSpacer size="s" />
          <span css={{ color: statInfo.textColor }}>{response.text}</span>
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
            <EuiSpacer size="s" />
            <EuiCallOut color="primary">
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.tokenHelpInfo"
                defaultMessage="Top {count} extracted tokens, which are not synonyms of the query, represent linguistic elements
              relevant to the search result. The weight value represents the relevancy of a given
              token."
                values={{ count: MAX_TOKENS }}
              />
            </EuiCallOut>
            <EuiSpacer size="s" />
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
            />
          </>
        </EuiAccordion>
      ) : null}
    </>
  );
};

interface ResultStatFormatting {
  color: string;
  textColor: string;
  text: string | null;
  icon: string | null;
}

const useResultStatFormatting = (
  response: FormattedTextExpansionResponse
): ResultStatFormatting => {
  const {
    euiTheme: { euiColorMediumShade, euiTextSubduedColor, euiTextColor },
  } = useCurrentThemeVars();

  if (response.score >= 5) {
    return {
      color: 'success',
      textColor: euiTextColor,
      icon: 'check',
      text: i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.goodMatch',
        { defaultMessage: 'Good match' }
      ),
    };
  }

  if (response.score > 0) {
    return {
      color: euiTextSubduedColor,
      textColor: euiTextColor,
      text: null,
      icon: null,
    };
  }

  return {
    color: euiColorMediumShade,
    textColor: euiColorMediumShade,
    text: null,
    icon: null,
  };
};
