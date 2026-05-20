import React from 'react';
export declare enum InfraTab {
    containers = "containers",
    pods = "pods",
    hosts = "hosts"
}
export declare function useTabs({ containerIds, podNames, hostNames, agentName, start, end, }: {
    containerIds: string[];
    podNames: string[];
    hostNames: string[];
    agentName?: string;
    start: string;
    end: string;
}): {
    id: "containers" | "hosts" | "pods";
    name: React.ReactNode;
    content: React.ReactNode;
}[];
