import type { Alert } from '@kbn/alerting-types';
import type { CasesService } from '@kbn/response-ops-alerts-table/types';
export declare const useCaseActions: ({ alerts, onAddToCase, services, }: {
    alerts: Alert[];
    onAddToCase?: ({ isNewCase }: {
        isNewCase: boolean;
    }) => void;
    services: {
        /**
         * The cases service is optional: cases features will be disabled if not provided
         */
        cases?: CasesService;
    };
}) => {
    isPopoverOpen: boolean;
    setIsPopoverOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    handleAddToExistingCaseClick: () => void;
    handleAddToNewCaseClick: () => void;
};
