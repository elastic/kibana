/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormLabel, EuiSpacer, type EuiComboBoxOptionOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { INTERNAL_FEATURE_FLAGS } from '../../../../common/constants';
import type { FindingsGroupByKind } from '../types';

const getGroupByOptions = (): Array<EuiComboBoxOptionOption<FindingsGroupByKind>> => [
  {
    value: 'default',
    label: i18n.translate('xpack.csp.findings.groupBySelector.groupByNoneLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'resource',
    label: i18n.translate('xpack.csp.findings.groupBySelector.groupByResourceIdLabel', {
      defaultMessage: 'Resource',
    }),
  },
];

interface Props {
  type: FindingsGroupByKind;
}

export const FindingsGroupBySelector = ({ type }: Props) => {
  const groupByOptions = useMemo(getGroupByOptions, []);
  const history = useHistory();

  if (!INTERNAL_FEATURE_FLAGS.showFindingsGroupBy) return null;

  const onChange = (options: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>) =>
    history.push({ pathname: `/findings/${options[0]?.value}` });

  return (
    <div>
      <EuiComboBox
        prepend={<GroupByLabel />}
        singleSelection={{ asPlainText: true }}
        options={groupByOptions}
        selectedOptions={groupByOptions.filter((o) => o.value === type)}
        onChange={onChange}
      />
      <EuiSpacer />
    </div>
  );
};

const GroupByLabel = () => (
  <EuiFormLabel>
    <FormattedMessage
      id="xpack.csp.findings.groupBySelector.groupByLabel"
      defaultMessage="Group by"
    />
  </EuiFormLabel>
);
