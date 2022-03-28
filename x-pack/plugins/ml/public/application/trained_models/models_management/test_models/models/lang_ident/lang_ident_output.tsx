/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiBasicTable, EuiTitle } from '@elastic/eui';

import type { FormattedLangIdentResp } from './lang_ident_inference';
import { getLanguage } from './lang_codes';

export const LangIdentOutput: FC<{ result: FormattedLangIdentResp }> = ({ result }) => {
  if (result.length === 0) {
    return null;
  }

  const lang = getLanguage(result[0].className);

  const items = result.map((r, i) => {
    return {
      noa: `${i + 1}`,
      className: getLanguage(r.className),
      classProbability: `${r.classProbability}`,
    };
  });

  const columns = [
    {
      field: 'noa',
      name: '#',
      width: '5%',
      truncateText: false,
      isExpander: false,
    },
    {
      field: 'className',
      name: i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.langIdent.output.language_title',
        {
          defaultMessage: 'Language',
        }
      ),
      width: '30%',
      truncateText: false,
      isExpander: false,
    },
    {
      field: 'classProbability',
      name: i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.langIdent.output.probability_title',
        {
          defaultMessage: 'Probability',
        }
      ),
      truncateText: false,
      isExpander: false,
    },
  ];

  const title =
    lang !== 'unknown'
      ? i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.title', {
          defaultMessage: 'This looks like {lang}',
          values: { lang },
        })
      : i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.output.titleUnknown', {
          defaultMessage: 'Language code unknown: {code}',
          values: { code: result[0].className },
        });

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>

      <EuiSpacer />
      <EuiBasicTable columns={columns} items={items} />
    </>
  );
};
