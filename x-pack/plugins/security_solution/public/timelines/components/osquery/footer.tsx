/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ACTIVE_PANEL } from '../side_panel/event_details';

interface EventDetailsFooterProps {
  handlePanelChange: (type: ACTIVE_PANEL | null) => void;
}

export const OsqueryEventDetailsFooterComponent = ({
  handlePanelChange,
}: EventDetailsFooterProps) => {
  const renderFooterBody = useMemo(() => {
    return (
      <EuiButtonEmpty onClick={() => handlePanelChange(null)}>
        <FormattedMessage id="xpack.securitySolution.footer.cancel" defaultMessage="Cancel" />
      </EuiButtonEmpty>
    );
  }, [handlePanelChange]);
  return (
    <>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>{renderFooterBody}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export const OsqueryEventDetailsFooter = React.memo(OsqueryEventDetailsFooterComponent);
