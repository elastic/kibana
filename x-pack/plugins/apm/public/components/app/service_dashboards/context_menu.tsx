import React, { useCallback, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiComboBox,
  EuiContextMenu,
  EuiIcon,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';
import { ApmPluginStartDeps } from '../../../plugin';

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
  const {
    services: {
      dashboard: { locator: dashboardLocator },
    },
  } = useKibana<ApmPluginStartDeps>();

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

  const panels = [
    {
      id: 0,
      title: '',
      items: [
        {
          name: i18n.translate(
            'xpack.apm.serviceDashboards.contextMenu.linkDashboard',
            {
              defaultMessage: 'Link new dashboard',
            }
          ),
          icon: 'plusInCircle',
          onClick: () => {
            closePopover();
          },
        },
        {
          name: i18n.translate(
            'xpack.apm.serviceDashboards.contextMenu.goToDashboard',
            {
              defaultMessage: 'Go to dashboard',
            }
          ),
          icon: 'visGauge',
          href: dashboardLocator?.getRedirectUrl({
            dashboardId: selectedDashboard?.dashboardSavedObjectId,
          }),
        },
        {
          name: i18n.translate(
            'xpack.apm.serviceDashboards.contextMenu.visGaugeDashboard',
            {
              defaultMessage: 'Edit dashboard link',
            }
          ),
          icon: 'pencil',
          onClick: () => {
            closePopover();
          },
        },
        {
          name: i18n.translate(
            'xpack.apm.serviceDashboards.contextMenu.unlinkDashboard',
            {
              defaultMessage: 'Unlink dashboard',
            }
          ),
          icon: 'unlink',
          onClick: () => {
            closePopover();
          },
        },
      ],
    },
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
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
