/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { CytoscapeContext } from './Cytoscape';
import { getAnimationOptions, getNodeHeight } from './cytoscapeOptions';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { APMQueryParams } from '../../shared/Links/url_helpers';

const ControlsContainer = styled('div')`
  left: ${({ theme }) => theme.eui.gutterTypes.gutterMedium};
  position: absolute;
  top: ${({ theme }) => theme.eui.gutterTypes.gutterSmall};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

const Button = styled(EuiButtonIcon)`
  display: block;
  margin: ${({ theme }) => theme.eui.paddingSizes.xs};
`;

const ZoomInButton = styled(Button)`
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const Panel = styled(EuiPanel)`
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const steps = 5;

function doZoom(cy: cytoscape.Core | undefined, increment: number, duration: number) {
  if (cy) {
    const level = cy.zoom() + increment;
    // @ts-ignore `.position()` _does_ work on a NodeCollection. It returns the position of the first element in the collection.
    const primaryCenter = cy.nodes('.primary').position();
    const { x1, y1, w, h } = cy.nodes().boundingBox({});
    const graphCenter = { x: x1 + w / 2, y: y1 + h / 2 };

    cy.animate({
      duration,
      zoom: {
        level,
        position: primaryCenter || graphCenter,
      },
    });
  }
}

export const Controls = () => {
  const theme = useTheme();
  const cy = useContext(CytoscapeContext);
  const { urlParams } = useUrlParams();
  const currentSearch = urlParams.kuery ?? '';
  const [zoom, setZoom] = useState((cy && cy.zoom()) || 1);
  const duration = parseInt(theme.eui.euiAnimSpeedFast, 10);

  useEffect(() => {
    if (cy) {
      cy.on('zoom', (event) => {
        setZoom(event.cy.zoom());
      });
    }
  }, [cy]);

  function center() {
    if (cy) {
      const eles = cy.nodes();
      cy.animate({
        ...getAnimationOptions(theme.eui),
        center: { eles },
        fit: { eles, padding: getNodeHeight(theme.eui) },
      });
    }
  }

  function zoomIn() {
    doZoom(cy, increment, duration);
  }

  function zoomOut() {
    doZoom(cy, -increment, duration);
  }

  if (!cy) {
    return null;
  }

  const maxZoom = cy.maxZoom();
  const isMaxZoom = zoom === maxZoom;
  const minZoom = cy.minZoom();
  const isMinZoom = zoom === minZoom;
  const increment = (maxZoom - minZoom) / steps;

  const centerLabel = i18n.translate('xpack.apm.serviceMap.center', {
    defaultMessage: 'Center',
  });
  const viewFullMapLabel = i18n.translate('xpack.apm.serviceMap.viewFullMap', {
    defaultMessage: 'View full service map',
  });
  const zoomInLabel = i18n.translate('xpack.apm.serviceMap.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const zoomOutLabel = i18n.translate('xpack.apm.serviceMap.zoomOut', {
    defaultMessage: 'Zoom out',
  });

  const showViewFullMapButton = cy.nodes('.primary').length > 0;

  return (
    <ControlsContainer>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip anchorClassName="eui-displayInline" content={zoomInLabel}>
          <ZoomInButton
            aria-label={zoomInLabel}
            color="text"
            disabled={isMaxZoom}
            iconType="plusInCircleFilled"
            onClick={zoomIn}
          />
        </EuiToolTip>
        <EuiToolTip anchorClassName="eui-displayInline" content={zoomOutLabel}>
          <Button
            aria-label={zoomOutLabel}
            color="text"
            disabled={isMinZoom}
            iconType="minusInCircleFilled"
            onClick={zoomOut}
          />
        </EuiToolTip>
      </Panel>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip anchorClassName="eui-displayInline" content={centerLabel}>
          <Button
            aria-label={centerLabel}
            color="text"
            iconType="crosshairs"
            onClick={center}
          />
        </EuiToolTip>
      </Panel>
      {showViewFullMapButton && (
        <Panel hasShadow={true} paddingSize="none">
          <EuiToolTip
            anchorClassName="eui-displayInline"
            content={viewFullMapLabel}
          >
            <Button
              aria-label={viewFullMapLabel}
              color="text"
              href={getAPMHref(
                '/service-map',
                currentSearch,
                urlParams as APMQueryParams
              )}
              iconType="apps"
            />
          </EuiToolTip>
        </Panel>
      )}
    </ControlsContainer>
  );
};
