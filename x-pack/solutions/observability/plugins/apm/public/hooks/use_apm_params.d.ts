import type { ValuesType } from 'utility-types';
import type { TypeOf, PathsOf } from '@kbn/typed-react-router-config';
import type { ApmRoutes } from '../components/routing/apm_route_config';
export declare function useMaybeApmParams<TPath extends PathsOf<ApmRoutes>>(path: TPath): TypeOf<ApmRoutes, TPath> | undefined;
export declare function useApmParams<TPath extends PathsOf<ApmRoutes>>(path: TPath): TypeOf<ApmRoutes, TPath>;
export declare function useAnyOfApmParams<TPaths extends Array<PathsOf<ApmRoutes>>>(...paths: TPaths): TypeOf<ApmRoutes, ValuesType<TPaths>>;
