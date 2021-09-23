/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { CasesNavigation, LinkButton } from '../links';

// TODO: Potentially move into links component?
export interface ConfigureCaseButtonProps {
  configureCasesNavigation: CasesNavigation;
  isDisabled: boolean;
  label: string;
  msgTooltip: JSX.Element;
  showToolTip: boolean;
  titleTooltip: string;
}

const ConfigureCaseButtonComponent: React.FC<ConfigureCaseButtonProps> = ({
  configureCasesNavigation: { href, onClick },
  isDisabled,
  label,
  msgTooltip,
  showToolTip,
  titleTooltip,
}: ConfigureCaseButtonProps) => {
  const configureCaseButton = useMemo(
    () => (
      <LinkButton
        onClick={onClick}
        href={href}
        iconType="controlsHorizontal"
        isDisabled={isDisabled}
        aria-label={label}
        data-test-subj="configure-case-button"
      >
        {label}
      </LinkButton>
    ),
    [label, isDisabled, onClick, href]
  );

  return showToolTip ? (
    <EuiToolTip
      position="top"
      title={titleTooltip}
      content={<p>{msgTooltip}</p>}
      data-test-subj="configure-case-tooltip"
    >
      {configureCaseButton}
    </EuiToolTip>
  ) : (
    <>{configureCaseButton}</>
  );
};

export const ConfigureCaseButton = memo(ConfigureCaseButtonComponent);
