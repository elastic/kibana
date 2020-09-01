/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldText,
  EuiFieldNumber,
  EuiBadge,
  EuiButtonIcon,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiTextArea,
  EuiAccordion,
  EuiButton,
} from '@elastic/eui';

import { VarConfig } from '../var_config';

import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { CanvasVariable } from '../../../types';
import { ComponentStrings } from '../../../i18n';

const { WorkpadConfig: strings } = ComponentStrings;

interface Props {
  size: {
    height: number;
    width: number;
  };
  name: string;
  css?: string;
  variables: CanvasVariable[];
  setSize: ({ height, width }: { height: number; width: number }) => void;
  setName: (name: string) => void;
  setWorkpadCSS: (css: string) => void;
  setWorkpadVariables: (vars: CanvasVariable[]) => void;
}

export const WorkpadConfig: FunctionComponent<Props> = (props) => {
  const [css, setCSS] = useState(props.css);
  const { size, name, setSize, setName, setWorkpadCSS, variables, setWorkpadVariables } = props;
  const rotate = () => setSize({ width: size.height, height: size.width });

  const badges = [
    {
      name: '1080p',
      size: { height: 1080, width: 1920 },
    },
    {
      name: '720p',
      size: { height: 720, width: 1280 },
    },
    {
      name: 'A4',
      size: { height: 842, width: 590 },
    },
    {
      name: strings.getUSLetterButtonLabel(),
      size: { height: 792, width: 612 },
    },
  ];

  return (
    <div>
      <div className="canvasLayout__sidebarHeaderWorkpad">
        <EuiTitle size="xs">
          <h4>{strings.getTitle()}</h4>
        </EuiTitle>
      </div>

      <EuiSpacer size="m" />

      <EuiFormRow label={strings.getNameLabel()} display="rowCompressed">
        <EuiFieldText compressed value={name} onChange={(e) => setName(e.target.value)} />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFormRow label={strings.getPageWidthLabel()} display="rowCompressed">
            <EuiFieldNumber
              compressed
              onChange={(e) => setSize({ width: Number(e.target.value), height: size.height })}
              value={size.width}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow display="rowCompressed" hasEmptyLabelSpace>
            <EuiToolTip position="bottom" content={strings.getFlipDimensionTooltip()}>
              <EuiButtonIcon
                iconType="merge"
                color="text"
                onClick={rotate}
                aria-label={strings.getFlipDimensionAriaLabel()}
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={strings.getPageHeightLabel()} display="rowCompressed">
            <EuiFieldNumber
              compressed
              onChange={(e) => setSize({ height: Number(e.target.value), width: size.width })}
              value={size.height}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <div>
        {badges.map((badge, i) => (
          <EuiBadge
            key={`page-size-badge-${i}`}
            color="hollow"
            onClick={() => setSize(badge.size)}
            aria-label={strings.getPageSizeBadgeAriaLabel(badge.name)}
            onClickAriaLabel={strings.getPageSizeBadgeOnClickAriaLabel(badge.name)}
          >
            {badge.name}
          </EuiBadge>
        ))}
      </div>

      <EuiSpacer size="m" />

      <VarConfig variables={variables} setVariables={setWorkpadVariables} />

      <div className="canvasSidebar__expandable">
        <EuiAccordion
          id="accordion-global-css"
          className="canvasSidebar__accordion"
          style={{ marginBottom: 0 }}
          buttonContent={
            <EuiToolTip
              content={strings.getGlobalCSSTooltip()}
              position="left"
              className="canvasArg__tooltip"
            >
              <span>{strings.getGlobalCSSLabel()}</span>
            </EuiToolTip>
          }
        >
          <div className="canvasSidebar__accordionContent">
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
    </div>
  );
};

WorkpadConfig.propTypes = {
  size: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  css: PropTypes.string,
  variables: PropTypes.array,
  setSize: PropTypes.func.isRequired,
  setName: PropTypes.func.isRequired,
  setWorkpadCSS: PropTypes.func.isRequired,
  setWorkpadVariables: PropTypes.func.isRequired,
};
