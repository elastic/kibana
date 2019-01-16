/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon, EuiIconTip, EuiText, EuiTextProps, IconType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ReactNode, SFC } from 'react';
import { ExplanationResult, PRIVILEGE_SOURCE } from '../../../../../../../lib/effective_privileges';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props extends EuiTextProps {
  privilege: string | string[];
  scope: 'global' | 'space';
  explanation?: ExplanationResult;
  styleMissingPrivilege?: boolean;
  iconType?: IconType;
  tooltipContent?: ReactNode;
}

export const PrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { scope, explanation } = props;

  if (!explanation) {
    return <SimplePrivilegeDisplay {...props} />;
  }

  if (explanation.overridesAssigned) {
    return <SupercededPrivilegeDisplay {...props} />;
  }

  if (
    scope === 'space' &&
    [PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_BASE, PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_FEATURE].includes(
      explanation.source
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
  const { supercededPrivilege, overrideSource } = props.explanation || ({} as ExplanationResult);

  return (
    <SimplePrivilegeDisplay
      {...props}
      iconType={'lock'}
      tooltipContent={
        <FormattedMessage
          id="xpack.security.management.editRole.spaceAwarePrivilegeDisplay.privilegeSupercededMessage"
          defaultMessage="Original privilege of {supercededPrivilege} has been overriden by {overrideSource}"
          values={{ supercededPrivilege: `'${supercededPrivilege}'`, overrideSource }}
        />
      }
    />
  );
};

export const EffectivePrivilegeDisplay: SFC<Props> = (props: Props) => {
  const { explanation, ...rest } = props;
  return (
    <SimplePrivilegeDisplay
      {...rest}
      iconType={'lock'}
      tooltipContent={explanation && explanation.details}
    />
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

function coerceToArray(privilege: string | string[]): string[] {
  if (Array.isArray(privilege)) {
    return privilege;
  }
  return [privilege];
}
