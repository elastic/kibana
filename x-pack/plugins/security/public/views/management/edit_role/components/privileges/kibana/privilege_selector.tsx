/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import React, { ChangeEvent, Component } from 'react';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

interface Props {
  ['data-test-subj']: string;
  availablePrivileges: KibanaPrivilege[];
  onChange: (privilege: KibanaPrivilege) => void;
  value: KibanaPrivilege | null;
  allowNone?: boolean;
  disabled?: boolean;
  compressed?: boolean;
}

export class PrivilegeSelector extends Component<Props, {}> {
  public state = {};

  public render() {
    const { availablePrivileges, value, disabled, allowNone, compressed } = this.props;

    const options = [];

    if (allowNone) {
      options.push({ value: NO_PRIVILEGE_VALUE, text: 'none' });
    }

    options.push(
      ...availablePrivileges.map(p => ({
        value: p,
        text: p,
      }))
    );

    return (
      <EuiSelect
        data-test-subj={this.props['data-test-subj']}
        options={options}
        hasNoInitialSelection={!allowNone && !value}
        value={value || undefined}
        onChange={this.onChange}
        disabled={disabled}
        compressed={compressed}
      />
    );
  }

  public onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.props.onChange(e.target.value as KibanaPrivilege);
  };
}
