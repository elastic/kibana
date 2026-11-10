/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * On hover, show the entity's type and sub-type (kind + catalog / span detail).
 */
export function EntityTypeTooltip({
  typeKindLabel,
  subtypeLabel,
  children,
}: {
  typeKindLabel?: string;
  subtypeLabel?: string;
  children: ReactNode;
}) {
  if (!typeKindLabel && !subtypeLabel) {
    return <>{children}</>;
  }

  const typeLine = typeKindLabel
    ? i18n.translate('xpack.apm.impactMap.entityTooltip.type', {
        defaultMessage: 'Type: {type}',
        values: { type: typeKindLabel },
      })
    : undefined;
  const subtypeLine = subtypeLabel
    ? i18n.translate('xpack.apm.impactMap.entityTooltip.subtype', {
        defaultMessage: 'Sub-type: {subtype}',
        values: { subtype: subtypeLabel },
      })
    : undefined;

  return (
    <EuiToolTip
      content={
        <EuiText size="xs">
          {typeLine ? <div>{typeLine}</div> : null}
          {subtypeLine ? <div>{subtypeLine}</div> : null}
        </EuiText>
      }
      position="top"
      delay="regular"
      disableScreenReaderOutput
    >
      <span
        data-test-subj="impactMapEntityTypeTooltip"
        css={css`
          display: inline-block;
          /* Groups set pointer-events: none on the box; the tip must still receive hover. */
          pointer-events: auto;
        `}
      >
        {children}
      </span>
    </EuiToolTip>
  );
}
