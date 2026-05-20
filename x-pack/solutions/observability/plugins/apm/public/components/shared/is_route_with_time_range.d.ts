import type { Location } from 'history';
import type { ApmRouter } from '../routing/apm_route_config';
export declare function isRouteWithTimeRange({ apmRouter, location, }: {
    apmRouter: ApmRouter;
    location: Location;
}): boolean;
export declare function isRouteWithComparison({ apmRouter, location, }: {
    apmRouter: ApmRouter;
    location: Location;
}): boolean;
