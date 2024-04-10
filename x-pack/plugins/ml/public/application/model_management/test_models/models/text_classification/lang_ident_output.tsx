/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import type { LangIdentInference } from './lang_ident_inference';
import { getLanguage } from './lang_codes';
import { PredictionProbabilityList } from './text_classification_output';
import type { FormattedTextClassificationResponse } from './common';

export const getLangIdentOutputComponent = (inferrer: LangIdentInference) => (
  <LangIdentOutput inferrer={inferrer} />
);

const LangIdentOutput: FC<{ inferrer: LangIdentInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <LanguageIdent response={response} inputText={inputText} />
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
};

const LanguageIdent: FC<{
  response: FormattedTextClassificationResponse;
  inputText: string;
}> = ({ response, inputText }) => {
  const langCode = response[0].value;
  const lang = getLanguage(langCode);

  const title =
    lang !== 'unknown'
      ? i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.title', {
          defaultMessage: 'This looks like {lang}',
          values: { lang },
        })
      : i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.titleUnknown', {
          defaultMessage: 'Language code unknown: {langCode}',
          values: { langCode },
        });

  return (
    <>
      <EuiText size="s" data-test-subj={'mlTestModelLangIdentInputText'}>
        {inputText}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTitle size="xxs">
        <h4 data-test-subj={'mlTestModelLangIdentTitle'}>{title}</h4>
      </EuiTitle>

      <EuiSpacer />
      <PredictionProbabilityList response={response} />
    </>
  );
};
