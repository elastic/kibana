/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiIconTip, EuiText, IconType, PropsOf, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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

export const SupersededPrivilegeDisplay: FC<Props> = (props: Props) => {
  const supersededPrivilege = 'TODO';
  const actualPrivilegeSource = 'MORE TODO';

  return (
    <SimplePrivilegeDisplay
      {...props}
      iconType={'lock'}
      iconTooltipContent={
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.privilegeSupercededMessage"
          defaultMessage="Original privilege of {supersededPrivilege} has been overriden by {actualPrivilegeSource}"
          values={{
            supersededPrivilege: `'${supersededPrivilege}'`,
            actualPrivilegeSource: getReadablePrivilegeSource(actualPrivilegeSource),
          }}
        />
      }
    />
  );
};

export const EffectivePrivilegeDisplay: FC<Props> = (props: Props) => {
  const { ...rest } = props;

  const source = getReadablePrivilegeSource('TODO');

  const iconTooltipContent = (
    <FormattedMessage
      id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.effectivePrivilegeMessage"
      defaultMessage="Granted via {source}."
      values={{ source }}
    />
  );

  return (
    <SimplePrivilegeDisplay {...rest} iconType={'lock'} iconTooltipContent={iconTooltipContent} />
  );
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

function getReadablePrivilegeSource(privilegeSource: string) {
  switch (privilegeSource) {
    case 'global_base':
      return (
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.globalBasePrivilegeSource"
          defaultMessage="global base privilege"
        />
      );
    case 'global_feature':
      return (
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.globalFeaturePrivilegeSource"
          defaultMessage="global feature privilege"
        />
      );
    case 'space_base':
      return (
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.spaceBasePrivilegeSource"
          defaultMessage="space base privilege"
        />
      );
    case 'space_feature':
      return (
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.spaceFeaturePrivilegeSource"
          defaultMessage="space feature privilege"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.unknownPrivilegeSource"
          defaultMessage="**UNKNOWN**"
        />
      );
  }
}
