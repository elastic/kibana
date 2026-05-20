import React from 'react';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types';
interface Props {
    onSwitch: () => void;
    isMigrating: boolean;
    isMigrated: boolean;
    isLoading: boolean;
    isLoadingConfirmation: boolean;
    cloudApmMigrationEnabled: boolean;
    hasCloudAgentPolicy: boolean;
    hasRequiredRole: boolean;
    cloudApmPackagePolicy: PackagePolicy | undefined;
    latestApmPackageVersion: string;
}
export declare function SchemaOverview({ onSwitch, isMigrating, isMigrated, isLoading, isLoadingConfirmation, cloudApmMigrationEnabled, hasCloudAgentPolicy, hasRequiredRole, cloudApmPackagePolicy, latestApmPackageVersion, }: Props): React.JSX.Element;
export declare function SchemaOverviewHeading(): React.JSX.Element;
export {};
