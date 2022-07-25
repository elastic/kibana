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
import { findingsNavigation } from '../../../common/navigation/constants';

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

const getFindingsGroupPath = (opts: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>) => {
  const [firstOption] = opts;

  switch (firstOption?.value) {
    case 'resource':
      return findingsNavigation.findings_by_resource.path;
    case 'default':
    default:
      return findingsNavigation.findings_default.path;
  }
};

export const FindingsGroupBySelector = ({ type }: Props) => {
  const groupByOptions = useMemo(getGroupByOptions, []);
  const history = useHistory();

  if (!INTERNAL_FEATURE_FLAGS.showFindingsGroupBy) return null;

  const onChange = (options: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>) =>
    history.push({ pathname: getFindingsGroupPath(options) });

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
