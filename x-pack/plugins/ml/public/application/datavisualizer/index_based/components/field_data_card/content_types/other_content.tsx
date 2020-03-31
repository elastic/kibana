/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';
import { ExamplesList } from '../examples_list';

export const OtherContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, type, aggregatable } = config;

  const { count, sampleCount, cardinality, examples } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiText>
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardOther.cardTypeLabel"
            defaultMessage="{cardType} type"
            values={{
              cardType: type,
            }}
          />
        </EuiText>
      </div>
      {aggregatable === true && (
        <Fragment>
          <EuiSpacer size="s" />
          <div>
            <EuiText size="xs" color="subdued">
              <EuiIcon type="document" />
              &nbsp;
              <FormattedMessage
                id="xpack.ml.fieldDataCard.cardOther.documentsCountDescription"
                defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
                values={{
                  count,
                  docsPercent,
                }}
              />
            </EuiText>
          </div>

          <EuiSpacer size="xs" />

          <div>
            <EuiText size="xs" color="subdued">
              <EuiIcon type="database" />
              &nbsp;
              <FormattedMessage
                id="xpack.ml.fieldDataCard.cardOther.distinctCountDescription"
                defaultMessage="{cardinality} distinct {cardinality, plural, zero {value} one {value} other {values}}"
                values={{
                  cardinality,
                }}
              />
            </EuiText>
          </div>
        </Fragment>
      )}
      <EuiSpacer size="m" />
      <ExamplesList examples={examples} />
    </div>
  );
};
