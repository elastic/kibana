import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import {
  EuiTextColor
} from '@elastic/eui';

export interface MetricChartListProps {
  data: [];
  showOther?: boolean;
  className?: string;
}

export const MetricChartList: FunctionComponent<MetricChartListProps
> = ({ data, className, showOther = true, ...rest }) => {
  const classes = classNames(
    'lnsMetricChartList', className,
  );

  return (
    <ul className={classes} {...rest}>
      {data.flatMap((metricRow: object) =>
        Object.values(metricRow).map(metric => (
          <li key={metric} title={metric} className="eui-textTruncate">
            {metric}
          </li>
        ))
      )
      .slice(0, 10)}
      {data.length > 10 &&
        <li>
          <EuiTextColor color="subdued">
            other <small>({data.length - 10})</small>
          </EuiTextColor>
        </li>
      }
    </ul>
  );
};
