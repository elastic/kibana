/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { getConfigureCasesUrl, useFormatUrl } from '../../../common/components/link_to';
import { LinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';

export interface ConfigureCaseButtonProps {
  label: string;
  isDisabled: boolean;
  msgTooltip: JSX.Element;
  showToolTip: boolean;
  titleTooltip: string;
  urlSearch: string;
}

const ConfigureCaseButtonComponent: React.FC<ConfigureCaseButtonProps> = ({
  isDisabled,
  label,
  msgTooltip,
  showToolTip,
  titleTooltip,
  urlSearch,
}: ConfigureCaseButtonProps) => {
  const history = useHistory();
  const { formatUrl } = useFormatUrl(SecurityPageName.case);
  const goToCaseConfigure = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getConfigureCasesUrl(urlSearch));
    },
    [history, urlSearch]
  );
  const configureCaseButton = useMemo(
    () => (
      <LinkButton
        onClick={goToCaseConfigure}
        href={formatUrl(getConfigureCasesUrl())}
        iconType="controlsHorizontal"
        isDisabled={isDisabled}
        aria-label={label}
        data-test-subj="configure-case-button"
      >
        {label}
      </LinkButton>
    ),
    [label, isDisabled, formatUrl, goToCaseConfigure]
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
