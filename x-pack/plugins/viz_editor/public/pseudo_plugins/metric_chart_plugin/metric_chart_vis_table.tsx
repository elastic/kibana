import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import {
  EuiTextColor
} from '@elastic/eui';

export interface MetricChartTableProps {
  data: [];
  className?: string;
}

export const MetricChartTable: FunctionComponent<MetricChartTableProps
> = ({ data, className, ...rest }) => {
  const classes = classNames(
    'lnsMetricChartTable', className,
  );

  return (
    <table className={classes} {...rest}>
      <thead className="euiScreenReaderOnly">
        <tr>
          <th>Value</th>
          <th align="right">Percentage</th>
        </tr>
      </thead>
      <colgroup>
        <col width="100%" />
        <col width="0%" />
      </colgroup>
      <tbody>
        {data.flatMap((metricRow: object) =>
          Object.values(metricRow).map(metric => (
            <tr key={metric}>
              <td title={metric} className="eui-textTruncate">
                <span
                  className="lnsMetricChartTable__tableBar--accent"
                  style={{ width: `${'6'}%` }}
                />
                {metric}
              </td>

              <td align="right">
                <EuiTextColor color="accent">{'6'}%</EuiTextColor>
              </td>
            </tr>
          ))
        )
        .slice(0, 10)}
        {data.length > 10 &&
          <tr>
            <td>
              <span
                className="lnsMetricChartTable__tableBar--subdued"
                style={{ width: `${'66'}%` }}
              />
              <EuiTextColor color="subdued">
                other <small>({data.length - 10})</small>
              </EuiTextColor>
            </td>
            <td align="right">
              <EuiTextColor color="subdued">{'66'}%</EuiTextColor>
            </td>
          </tr>
        }
      </tbody>
    </table>
  );
};
