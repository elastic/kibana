import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';

enum ContextMenuActionEnum {
  Edit = 'edit',
  Link = 'link',
  Unlink = 'unlink',
}
type Props = {
  serviceDashboards: SavedServiceDashboard[];
  selectedDashboard: SavedServiceDashboard;
  handleOnChange: (selectedId: string) => void;
  actions: { id: ContextMenuActionEnum; action: React.ReactNode }[];
  items: React.ReactNode[];
};

export function ContextMenu({
  serviceDashboards,
  selectedDashboard,
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
    if (!selectedDashboard && serviceDashboards.length > 0) {
      const [serviceDashboard] = serviceDashboards;
      handleOnChange(serviceDashboard.dashboardSavedObjectId);
    }
  }, [selectedDashboard, serviceDashboards]);

  return (
    <>
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          {
            <EuiComboBox
              compressed
              style={{ minWidth: '200px' }}
              placeholder={i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.placeholder',
                {
                  defaultMessage: 'Select dasbboard',
                }
              )}
              prepend={i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.prepend',
                {
                  defaultMessage: 'Dashboard',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={
                selectedDashboard
                  ? [
                      {
                        value: selectedDashboard?.dashboardSavedObjectId,
                        label: selectedDashboard?.dashboardTitle,
                      },
                    ]
                  : []
              }
              onChange={([newItem]) => handleOnChange(newItem.value)}
              isClearable={false}
            />
          }
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
