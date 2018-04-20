/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

import {
  KuiControlledTable,
  KuiEmptyTablePromptPanel,
  KuiPager,
  KuiTable,
  KuiTableBody,
  KuiTableHeader,
  KuiTableHeaderCell,
  KuiToolBar,
  KuiToolBarFooter,
  KuiToolBarFooterSection,
  KuiToolBarSearchBox,
  KuiToolBarSection
} from '@kbn/ui-framework/components';

import EmptyMessage from '../EmptyMessage';
import { fontSizes, colors } from '../../../style/variables';

export const FooterText = styled.div`
  font-size: ${fontSizes.small};
  color: ${colors.gray3};
`;

export const AlignmentKuiTableHeaderCell = styled(KuiTableHeaderCell)`
  max-width: none;

  &.kuiTableHeaderCell--alignRight > button > span {
    justify-content: flex-end;
  }
`; // Fixes alignment for sortable KuiTableHeaderCell children

function APMTable({
  defaultSearchQuery,
  emptyMessageHeading,
  emptyMessageSubHeading,
  items,
  itemsPerPage,
  onClickNext,
  onClickPrev,
  onFilter,
  inputPlaceholder,
  page,
  renderBody,
  renderFooterText,
  renderHead,
  totalItems
}) {
  const startNumber = page * itemsPerPage;
  const endNumber = (page + 1) * itemsPerPage;

  const pagination = (
    <KuiToolBarSection>
      <KuiPager
        startNumber={startNumber}
        endNumber={Math.min(endNumber, totalItems)}
        totalItems={totalItems}
        hasNextPage={endNumber < totalItems}
        hasPreviousPage={page > 0}
        onNextPage={onClickNext}
        onPreviousPage={onClickPrev}
      />
    </KuiToolBarSection>
  );

  return (
    <KuiControlledTable>
      <KuiToolBar>
        <KuiToolBarSearchBox
          defaultValue={defaultSearchQuery}
          onClick={e => e.stopPropagation()}
          onFilter={onFilter}
          placeholder={inputPlaceholder}
        />
        {pagination}
      </KuiToolBar>

      {items.length === 0 && (
        <KuiEmptyTablePromptPanel>
          <EmptyMessage
            heading={emptyMessageHeading}
            subheading={emptyMessageSubHeading}
          />
        </KuiEmptyTablePromptPanel>
      )}

      {items.length > 0 && (
        <KuiTable>
          <KuiTableHeader>{renderHead()}</KuiTableHeader>
          <KuiTableBody>{renderBody(items)}</KuiTableBody>
        </KuiTable>
      )}

      <KuiToolBarFooter>
        <KuiToolBarFooterSection>
          <FooterText>{renderFooterText()}</FooterText>
        </KuiToolBarFooterSection>
        {pagination}
      </KuiToolBarFooter>
    </KuiControlledTable>
  );
}

APMTable.propTypes = {
  defaultSearchQuery: PropTypes.string,
  emptyMessageHeading: PropTypes.string,
  items: PropTypes.array,
  itemsPerPage: PropTypes.number.isRequired,
  onClickNext: PropTypes.func.isRequired,
  onClickPrev: PropTypes.func.isRequired,
  onFilter: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  renderBody: PropTypes.func.isRequired,
  renderFooterText: PropTypes.func,
  renderHead: PropTypes.func.isRequired,
  totalItems: PropTypes.number.isRequired
};

APMTable.defaultProps = {
  items: [],
  page: 0,
  renderFooterText: () => {},
  totalItems: 0
};

export default APMTable;
