import React, { useEffect } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';

type Props = {
  serviceDashboards: SavedServiceDashboard[];
  currentDashboard?: SavedServiceDashboard;
  handleOnChange: (selectedId: string) => void;
};

export function DashboardSelector({
  serviceDashboards,
  currentDashboard,
  handleOnChange,
}: Props) {
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
        currentDashboard
          ? [
              {
                value: currentDashboard?.dashboardSavedObjectId,
                label: currentDashboard?.dashboardTitle,
              },
            ]
          : []
      }
      onChange={([newItem]) => handleOnChange(newItem.value)}
      isClearable={false}
    />
  );
}
