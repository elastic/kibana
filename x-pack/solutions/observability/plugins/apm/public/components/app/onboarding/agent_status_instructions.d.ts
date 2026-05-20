import React from 'react';
export declare function agentStatusCheckInstruction({ checkAgentStatus, agentStatus, agentStatusLoading, }: {
    checkAgentStatus: () => void;
    agentStatus?: boolean;
    agentStatusLoading: boolean;
}): {
    title: string;
    children: React.JSX.Element;
    status: "complete" | "warning" | "incomplete";
};
