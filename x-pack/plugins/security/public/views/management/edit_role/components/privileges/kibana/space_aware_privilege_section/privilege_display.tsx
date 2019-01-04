/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiIconTip, EuiText, EuiTextProps, IconType } from '@elastic/eui';
import _ from 'lodash';
import React, { ReactNode, SFC } from 'react';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props extends EuiTextProps {
  privilege: string | string[];
  styleMissingPrivilege?: boolean;
  iconType?: IconType;
  tooltipContent?: ReactNode;
}

export const PrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { privilege, styleMissingPrivilege, iconType, tooltipContent, ...rest } = props;

  return (
    <EuiText {...rest}>
      {getDisplayValue(privilege, styleMissingPrivilege)} {getIconTip(iconType, tooltipContent)}
    </EuiText>
  );
};

PrivilegeDisplay.defaultProps = {
  privilege: [],
  styleMissingPrivilege: true,
};

function getDisplayValue(privilege: string | string[], styleMissingPrivilege?: boolean) {
  const privileges = coerceToArray(privilege);

  let displayValue: string | ReactNode;

  const isPrivilegeMissing =
    privileges.length === 0 || (privileges.length === 1 && privileges.includes(NO_PRIVILEGE_VALUE));

  if (isPrivilegeMissing && styleMissingPrivilege) {
    displayValue = (
      <EuiText>
        <EuiIcon size={'s'} type={'minusInCircle'} /> none
      </EuiText>
    );
  } else {
    displayValue = privileges.map(p => _.capitalize(p)).join(', ');
  }

  return displayValue;
}

function getIconTip(iconType?: IconType, tooltipContent?: ReactNode) {
  if (!iconType || !tooltipContent) {
    return null;
  }

  return <EuiIconTip type={iconType} content={tooltipContent} size={'s'} />;
}

function coerceToArray(privilege: string | string[]): string[] {
  if (Array.isArray(privilege)) {
    return privilege;
  }
  return [privilege];
}
