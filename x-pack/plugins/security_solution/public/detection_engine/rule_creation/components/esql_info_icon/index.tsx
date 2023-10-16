/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import * as i18n from './translations';

import { useBoolState } from '../../../../common/hooks/use_bool_state';

import { useKibana } from '../../../../common/lib/kibana';

const POPOVER_WIDTH = 640;

/**
 * Icon and popover that gives hint to users how to get started with ES|QL rules
 */
const EsqlInfoIconComponent = () => {
  const { docLinks } = useKibana().services;

  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();

  const button = (
    <EuiButtonIcon iconType="iInCircle" onClick={togglePopover} aria-label={i18n.ARIA_LABEL} />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <Markdown
          markdown={i18n.getTooltipContent(
            docLinks.links.esql.statsBy,
            // Docs team will provide actual link to a new page before release
            // For now, it's just a mock
            docLinks.links.esql.statsBy
          )}
        />
      </EuiText>
    </EuiPopover>
  );
};

export const EsqlInfoIcon = React.memo(EsqlInfoIconComponent);

EsqlInfoIcon.displayName = 'EsqlInfoIcon';
