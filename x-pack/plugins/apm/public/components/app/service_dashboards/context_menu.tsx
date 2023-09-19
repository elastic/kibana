import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiComboBox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';

type Props = {
  serviceDashboards: SavedServiceDashboard[];
  selectedDashboard: SavedServiceDashboard;
  handleOnChange: (selectedId: string) => void;
};

export function ContextMenu({
  serviceDashboards,
  selectedDashboard,
  handleOnChange,
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
      console.log('if- contect menu - serviceDashboards', serviceDashboards);
      console.log('if- contect menu - selectedDashboard', selectedDashboard);
      const [serviceDashboard] = serviceDashboards;
      console.log('first service dashboard', serviceDashboard);
      handleOnChange(serviceDashboard.dashboardSavedObjectId);
    }
  }, [selectedDashboard, serviceDashboards]);

  const items = [
    <EuiContextMenuItem
      key="plusInCircle"
      icon="plusInCircle"
      onClick={closePopover}
    >
      {i18n.translate('xpack.apm.serviceDashboards.contextMenu.linkDashboard', {
        defaultMessage: 'Link new dashboard',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="visGauge" icon="visGauge" onClick={closePopover}>
      {i18n.translate('xpack.apm.serviceDashboards.contextMenu.goToDashboard', {
        defaultMessage: 'Go to dashboard',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="edit" icon="pencil" onClick={closePopover}>
      {i18n.translate(
        'xpack.apm.serviceDashboards.contextMenu.visGaugeDashboard',
        {
          defaultMessage: 'Edit dashboard link',
        }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      color="red"
      key="unlink"
      icon="unlink"
      onClick={closePopover}
    >
      {i18n.translate(
        'xpack.apm.serviceDashboards.contextMenu.unlinkDashboard',
        {
          defaultMessage: 'Unlink dashboard',
        }
      )}
    </EuiContextMenuItem>,
  ];

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
            <EuiContextMenuPanel size="s" items={items} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
