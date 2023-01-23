/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBetaBadge } from '@elastic/eui';
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';

interface Props {
  iconType: IconType;
  label: string;
}

const LabelContainer = styled.span`
  max-width: 72%;
  float: left;
  &:hover,
  &:focus-within,
  &:focus {
    text-decoration: underline;
  }
`;

const StyledBetaBadge = styled(EuiBetaBadge)`
  margin-left: 5px;
  margin-bottom: -6px;
`;

export function NavNameWithBetaBadge({ label, iconType }: Props) {
  return (
    <>
      <LabelContainer className="eui-textTruncate">
        <span>{label}</span>
      </LabelContainer>
      <StyledBetaBadge
        label={i18n.translate('xpack.infra.hostsPage.experimentalBadgeLabel', {
          defaultMessage: 'Technical preview',
        })}
        size="m"
        iconType={iconType}
      />
    </>
  );
}
