/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiContextMenu,
} from '@elastic/eui';
import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  region?: string;
  options: string[];
  changeRegion: (name: string) => void;
}

export const WaffleRegionControls = (props: Props) => {
  const { region, options } = props;
  const [isOpen, setIsOpen] = useState();

  const showPopover = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const currentLabel = options.find(o => region === o);

  const changeRegion = useCallback(
    (val: string) => {
      if (region === val) {
        props.changeRegion('');
      } else {
        props.changeRegion(val);
      }
      closePopover();
    },
    [region, closePopover, props]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        title: '',
        items: options.map(o => {
          const icon = o === region ? 'check' : 'empty';
          const panel = { name: o, onClick: () => changeRegion(o), icon };
          return panel;
        }),
      },
    ],
    [changeRegion, options, region]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isOpen}
        id="regionPanel"
        button={
          <EuiFilterButton iconType="arrowDown" onClick={showPopover}>
            <FormattedMessage
              id="xpack.infra.waffle.regionLabel"
              defaultMessage="Region: {selectedRegion}"
              values={{
                selectedRegion:
                  currentLabel ||
                  i18n.translate('xpack.infra.waffle.region', {
                    defaultMessage: 'All',
                  }),
              }}
            />
          </EuiFilterButton>
        }
        anchorPosition="downLeft"
        panelPaddingSize="none"
        closePopover={closePopover}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
