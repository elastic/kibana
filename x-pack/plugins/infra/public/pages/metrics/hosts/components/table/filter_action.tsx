/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonEmpty, useEuiTheme, euiCanAnimate } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

import { useBoolean } from '../../../../../hooks/use_boolean';

const selectedHostsLabel = (selectedHostsCount: number) => {
  return i18n.translate('xpack.infra.hostsViewPage.table.selectedHostsButton', {
    values: { selectedHostsCount },
    defaultMessage:
      'Selected {selectedHostsCount} {selectedHostsCount, plural, =1 {host} other {hosts}}',
  });
};

interface FilterActionProps {
  selectedItemsCount: number;
  filterSelectedHosts: () => void;
}

export const FilterAction = ({ selectedItemsCount, filterSelectedHosts }: FilterActionProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const onAddFilterClick = () => {
    filterSelectedHosts();
    closePopover();
  };

  return (
    <Container>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        data-test-subj="bulkAction"
        panelPaddingSize="s"
        className={selectedItemsCount === 0 ? '' : 'is-visible'}
        css={css`
          position: absolute;
          opacity: 0;
          visibility: hidden;
          &:is(.is-visible) {
            opacity: 1;
            ${euiCanAnimate} {
              transition: opacity ${euiTheme.animation.extraFast} ease-in;
            }
            visibility: visible;
          }
        `}
        button={
          <EuiButtonEmpty
            data-test-subj="hostsViewTableSelectHostsFilterButton"
            size="xs"
            iconSide="right"
            iconType="arrowDown"
            onClick={togglePopover}
          >
            {selectedHostsLabel(selectedItemsCount)}
          </EuiButtonEmpty>
        }
      >
        <EuiButtonEmpty
          data-test-subj="hostsViewTableAddFilterButton"
          iconType="filter"
          onClick={onAddFilterClick}
        >
          {i18n.translate('xpack.infra.hostsViewPage.table.addFilter', {
            defaultMessage: 'Add filter',
          })}
        </EuiButtonEmpty>
      </EuiPopover>
    </Container>
  );
};

const Container = euiStyled.div`
  position: relative;
  height:  ${({ theme }) => theme.eui.euiSizeL};
`;
