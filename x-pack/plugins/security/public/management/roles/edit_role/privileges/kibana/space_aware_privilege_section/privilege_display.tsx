/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiIconTip, EuiText, IconType, PropsOf, EuiToolTip } from '@elastic/eui';
import _ from 'lodash';
import React, { ReactNode, FC } from 'react';
import { NO_PRIVILEGE_VALUE } from '../constants';

interface Props extends PropsOf<typeof EuiText> {
  privilege: string | string[] | undefined;
  iconType?: IconType;
  iconTooltipContent?: ReactNode;
  tooltipContent?: ReactNode;
}

export const PrivilegeDisplay: FC<Props> = (props: Props) => {
  return <SimplePrivilegeDisplay {...props} />;
};

const SimplePrivilegeDisplay: FC<Props> = (props: Props) => {
  const { privilege, iconType, iconTooltipContent, tooltipContent, ...rest } = props;

  const text = (
    <EuiText {...rest}>
      {getDisplayValue(privilege)} {getIconTip(iconType, iconTooltipContent)}
    </EuiText>
  );

  if (tooltipContent) {
    return <EuiToolTip content={tooltipContent}>{text}</EuiToolTip>;
  }

  return text;
};

PrivilegeDisplay.defaultProps = {
  privilege: [],
};

function getDisplayValue(privilege: string | string[] | undefined) {
  const privileges = coerceToArray(privilege);

  let displayValue: string | ReactNode;

  const isPrivilegeMissing =
    privileges.length === 0 || (privileges.length === 1 && privileges.includes(NO_PRIVILEGE_VALUE));

  if (isPrivilegeMissing) {
    displayValue = <EuiIcon color="subdued" type={'minusInCircle'} />;
  } else {
    displayValue = privileges.map(p => _.capitalize(p)).join(', ');
  }

  return displayValue;
}

function getIconTip(iconType?: IconType, tooltipContent?: ReactNode) {
  if (!iconType || !tooltipContent) {
    return null;
  }

  return (
    <EuiIconTip
      iconProps={{
        className: 'eui-alignTop',
      }}
      color="subdued"
      type={iconType}
      content={tooltipContent}
      size={'s'}
    />
  );
}

function coerceToArray(privilege: string | string[] | undefined): string[] {
  if (privilege === undefined) {
    return [];
  }
  if (Array.isArray(privilege)) {
    return privilege;
  }
  return [privilege];
}
