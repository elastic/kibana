import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';

type Props = {
  serviceDashboards: SavedServiceDashboard[];
  currentDashboard: SavedServiceDashboard;
  handleOnChange: (selectedId: string) => void;
  items: React.ReactNode[];
};

export function ContextMenu({
  serviceDashboards,
  currentDashboard,
  handleOnChange,
  items,
}: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...serviceDashboards.map(({ dashboardSavedObjectId, dashboardTitle }) => {
      return { label: dashboardTitle, value: dashboardSavedObjectId };
    }),
  ];

  useEffect(() => {
    if (!currentDashboard && serviceDashboards.length > 0) {
      const [serviceDashboard] = serviceDashboards;
      handleOnChange(serviceDashboard.dashboardSavedObjectId);
    }
  }, [currentDashboard, serviceDashboards]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="base"
          size="s"
          iconType="boxesVertical"
          aria-label="More"
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={items.map((item: React.ReactNode) => (
          <EuiContextMenuItem size="s"> {item}</EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
