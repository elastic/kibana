/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormLabel, type EuiComboBoxOptionOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { FindingsGroupByKind } from '../../../common/types';
import { findingsNavigation } from '../../../common/navigation/constants';
import * as TEST_SUBJECTS from '../test_subjects';

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
  pathnameHandler?: (opts: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>) => string;
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

export const FindingsGroupBySelector = ({
  type,
  pathnameHandler = getFindingsGroupPath,
}: Props) => {
  const groupByOptions = useMemo(getGroupByOptions, []);
  const history = useHistory();

  const onChange = (options: Array<EuiComboBoxOptionOption<FindingsGroupByKind>>) =>
    history.push({ pathname: pathnameHandler(options) });

  return (
    <EuiComboBox
      data-test-subj={TEST_SUBJECTS.FINDINGS_GROUP_BY_SELECTOR}
      prepend={<GroupByLabel />}
      singleSelection={{ asPlainText: true }}
      options={groupByOptions}
      selectedOptions={groupByOptions.filter((o) => o.value === type)}
      onChange={onChange}
      isClearable={false}
      compressed
    />
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
