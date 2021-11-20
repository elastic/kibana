/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';

interface Props {
  label: string;
  localStorageId: string;
}

const LabelContainer = styled.span`
  max-width: 72%;
  float: left;
  &:hover,
  &:focus {
    text-decoration: underline;
  }
`;

const StyledBadge = styled(EuiBadge)`
  margin-left: 8px;
`;

/**
 * Gets current state from local storage to show or hide the badge.
 * Default value: true
 * @param localStorageId
 */
function getBadgeVisibility(localStorageId: string) {
  const storedItem = window.localStorage.getItem(localStorageId);
  if (storedItem) {
    return JSON.parse(storedItem) as boolean;
  }

  return true;
}

/**
 * Saves on local storage that this item should no longer be visible
 * @param localStorageId
 */
export function hideBadge(localStorageId: string) {
  window.localStorage.setItem(localStorageId, JSON.stringify(false));
}

export function NavNameWithBadge({ label, localStorageId }: Props) {
  const isBadgeVisible = getBadgeVisibility(localStorageId);
  return (
    <>
      <LabelContainer className="eui-textTruncate">
        <span>{label}</span>
      </LabelContainer>
      {isBadgeVisible && (
        <StyledBadge color="accent">
          {i18n.translate('xpack.observability.navigation.newBadge', {
            defaultMessage: 'NEW',
          })}
        </StyledBadge>
      )}
    </>
  );
}
