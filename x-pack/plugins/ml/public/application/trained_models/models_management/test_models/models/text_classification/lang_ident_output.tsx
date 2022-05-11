/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import type { LangIdentInference } from './lang_ident_inference';
import { getLanguage } from './lang_codes';
import { getTextClassificationOutputComponent } from './text_classification_output';

export const getLangIdentOutputComponent = (inferrer: LangIdentInference) => (
  <LangIdentOutput inferrer={inferrer} />
);

const LangIdentOutput: FC<{ inferrer: LangIdentInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.inferenceResult$);
  if (!result || result.response.length === 0) {
    return null;
  }

  const lang = getLanguage(result.response[0].value);

  const title =
    lang !== 'unknown'
      ? i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.title', {
          defaultMessage: 'This looks like {lang}',
          values: { lang },
        })
      : i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.titleUnknown', {
          defaultMessage: 'Language code unknown: {code}',
          values: { code: result.response[0].value },
        });

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>

      <EuiSpacer />
      {getTextClassificationOutputComponent(inferrer)}
    </>
  );
};
