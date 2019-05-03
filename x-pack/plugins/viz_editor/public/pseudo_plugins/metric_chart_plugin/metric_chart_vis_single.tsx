import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import {
  // @ts-ignore
  EuiStat
} from '@elastic/eui';

export interface MetricChartSingleProps {
  data: [];
  title?: string;
  className?: string;
  textAlign?: 'left' | 'right' | 'center',
}

export const MetricChartSingle: FunctionComponent<MetricChartSingleProps
> = ({ data, title, textAlign = 'center', className, ...rest }) => {
  const classes = classNames(
    'lnsMetricChartSingle', className,
  );

  const metric = data.flatMap((metricRow: object) =>
      Object.values(metricRow).map(metric => metric)
    );

  return (
    <EuiStat
      className={classes}
      title={metric}
      description={title}
      textAlign={textAlign}
      {...rest}
    />
  );
};
