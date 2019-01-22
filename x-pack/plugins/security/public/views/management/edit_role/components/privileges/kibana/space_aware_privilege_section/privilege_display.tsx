/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiIconTip, EuiText, EuiTextProps, IconType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ReactNode, SFC } from 'react';
import {
  PRIVILEGE_SOURCE,
  PrivilegeExplanation,
} from '../../../../../../../lib/kibana_privilege_calculator';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props extends EuiTextProps {
  privilege: string | string[];
  scope: 'global' | 'space';
  explanation?: PrivilegeExplanation;
  styleMissingPrivilege?: boolean;
  iconType?: IconType;
  tooltipContent?: ReactNode;
}

export const PrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { scope, explanation } = props;

  if (!explanation) {
    return <SimplePrivilegeDisplay {...props} />;
  }

  if (explanation.supercededPrivilege) {
    return <SupercededPrivilegeDisplay {...props} />;
  }

  if (
    scope === 'space' &&
    [PRIVILEGE_SOURCE.GLOBAL_BASE, PRIVILEGE_SOURCE.GLOBAL_FEATURE].includes(
      explanation.actualPrivilegeSource
    )
  ) {
    return <EffectivePrivilegeDisplay {...props} />;
  }

  return <SimplePrivilegeDisplay {...props} />;
};

const SimplePrivilegeDisplay: SFC<Props> = (props: Props) => {
  const {
    privilege,
    styleMissingPrivilege,
    iconType,
    tooltipContent,
    scope,
    explanation,
    ...rest
  } = props;

  return (
    <EuiText {...rest}>
      {getDisplayValue(privilege, styleMissingPrivilege)} {getIconTip(iconType, tooltipContent)}
    </EuiText>
  );
};

export const SupercededPrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { supercededPrivilege, actualPrivilegeSource } =
    props.explanation || ({} as PrivilegeExplanation);

  return (
    <SimplePrivilegeDisplay
      {...props}
      iconType={'lock'}
      tooltipContent={
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.privilegeSupercededMessage"
          defaultMessage="Original privilege of {supercededPrivilege} has been overriden by {overrideSource}"
          values={{ supercededPrivilege: `'${supercededPrivilege}'`, actualPrivilegeSource }}
        />
      }
    />
  );
};

export const EffectivePrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { explanation, ...rest } = props;
  return (
    <SimplePrivilegeDisplay {...rest} iconType={'lock'} tooltipContent={'NEED DETAILS HERE'} />
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
      // TODO: Waiting on update from EUI
      // iconProps={{
      //   className: 'eui-alignTop',
      // }}
      type={iconType}
      content={tooltipContent}
      size={'s'}
    />
  );
}

function coerceToArray(privilege: string | string[]): string[] {
  if (Array.isArray(privilege)) {
    return privilege;
  }
  return [privilege];
}
