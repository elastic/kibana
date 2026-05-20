import React from 'react';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
type Config = APIReturnType<'GET /api/apm/settings/agent-configuration 2023-10-31'>['configurations'][0];
interface Props {
    config: Config;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function ConfirmDeleteModal({ config, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
