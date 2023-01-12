/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { HeaderSection } from '../../../../common/components/header_section';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { useExpandableFlyoutContext } from '../../../context';
import { useEventDetailsPanelContext } from '../event/context';
import * as i18n from '../event/translations';

export const ReasonDetails = () => {
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const { flyoutScope } = useExpandableFlyoutContext();
  const { dataAsNestedObject } = useEventDetailsPanelContext();

  const renderer = useMemo(
    () =>
      dataAsNestedObject != null
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <HeaderSection
          alignHeader="center"
          hideSubtitle
          outerDirection="row"
          title={i18n.ALERT_REASON_TITLE}
          titleSize="xs"
          toggleQuery={setIsPanelExpanded}
          toggleStatus={isPanelExpanded}
        />
        {isPanelExpanded && renderer != null && dataAsNestedObject != null && (
          <div
            data-test-subj="renderer"
            css={css`
              overflow-x: auto;
              margin-left: -24px;

              & .euiFlexGroup {
                justify-content: flex-start;
              }
            `}
          >
            {renderer.renderRow({
              contextId: 'event-details',
              data: dataAsNestedObject,
              isDraggable: flyoutScope === 'timelineFlyout',
              scopeId: flyoutScope ?? '',
            })}
          </div>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
