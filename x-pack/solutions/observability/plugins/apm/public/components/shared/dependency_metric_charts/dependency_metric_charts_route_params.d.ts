import type { TypeOf } from '@kbn/typed-react-router-config';
import type { ApmRoutes } from '../../routing/apm_route_config';
export type DependencyMetricChartsRouteParams = Pick<{
    spanName?: string;
} & TypeOf<ApmRoutes, '/dependencies/operation' | '/dependencies/overview'>['query'], 'dependencyName' | 'comparisonEnabled' | 'spanName' | 'rangeFrom' | 'rangeTo' | 'kuery' | 'environment' | 'comparisonEnabled' | 'offset'>;
