/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiSpacer, EuiToolTip, EuiTextArea, EuiAccordion, EuiText, EuiButton } from '@elastic/eui';

import { DEFAULT_WORKPAD_CSS } from '../../../../common/lib/constants';
import { ComponentStrings } from '../../../../i18n';
const { WorkpadConfig: strings } = ComponentStrings;

export interface Props {
  workpadCSS?: string;
  setWorkpadCSS: (css: string) => void;
}

export const WorkpadCSS: FC<Props> = ({ workpadCSS, setWorkpadCSS }) => {
  const [css, setCSS] = useState(workpadCSS);

  return (
    <div className="canvasArg--expandable">
      <EuiAccordion
        id="accordion-global-css"
        className="canvasArg__accordion"
        buttonContent={
          <EuiToolTip
            content={strings.getGlobalCSSTooltip()}
            position="left"
            className="canvasArg__tooltip"
          >
            <EuiText size="s" color="subdued">
              {strings.getGlobalCSSLabel()}
            </EuiText>
          </EuiToolTip>
        }
      >
        <div className="canvasArg__content">
          <EuiTextArea
            aria-label={strings.getGlobalCSSTooltip()}
            value={css}
            compressed
            onChange={(e) => setCSS(e.target.value)}
            rows={10}
          />
          <EuiSpacer size="s" />
          <EuiButton size="s" onClick={() => setWorkpadCSS(css || DEFAULT_WORKPAD_CSS)}>
            {strings.getApplyStylesheetButtonLabel()}
          </EuiButton>
          <EuiSpacer size="xs" />
        </div>
      </EuiAccordion>
    </div>
  );
};

WorkpadCSS.propTypes = {
  workpadCSS: PropTypes.string,
  setWorkpadCSS: PropTypes.func.isRequired,
};
