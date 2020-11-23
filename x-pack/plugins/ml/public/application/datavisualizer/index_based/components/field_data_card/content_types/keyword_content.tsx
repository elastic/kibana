/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldDataCardProps } from '../field_data_card';
import { TopValues } from '../top_values';

export const KeywordContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat } = config;

  return (
    <div className="mlFieldDataCard__stats">
      <EuiTitle size="xxxs" className="mlFieldDataCard__valuesTitle">
        <span>
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardKeyword.topValuesLabel"
            defaultMessage="Top values"
          />
        </span>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
    </div>
  );
};
