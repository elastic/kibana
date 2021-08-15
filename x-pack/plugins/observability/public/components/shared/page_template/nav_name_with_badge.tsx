/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

interface Props {
  label: string;
  badgeLabel: string;
  localstorageId: string;
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
 * @param localstorageId
 */
function getBadgeVisibility(localstorageId: string) {
  const storedItem = window.localStorage.getItem(localstorageId);
  if (storedItem) {
    return JSON.parse(storedItem) as boolean;
  }

  return true;
}

/**
 * Saves on local storage that this item should no longer be visible
 * @param localstorageId
 */
export function hideBadge(localstorageId: string) {
  window.localStorage.setItem(localstorageId, JSON.stringify(false));
}

export function NavNameWithBadge({ label, badgeLabel, localstorageId }: Props) {
  const isBadgeVisible = getBadgeVisibility(localstorageId);
  return (
    <>
      <LabelContainer className="eui-textTruncate">
        <span>{label}</span>
      </LabelContainer>
      {isBadgeVisible && <StyledBadge color="accent">{badgeLabel}</StyledBadge>}
    </>
  );
}
