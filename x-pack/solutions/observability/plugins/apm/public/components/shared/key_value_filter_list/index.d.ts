import React from 'react';
interface KeyValue {
    key: string;
    value: any | undefined;
    isFilterable: boolean;
}
export declare function KeyValueFilterList({ icon, title, keyValueList, initialIsOpen, onClickFilter, }: {
    title: string;
    keyValueList: KeyValue[];
    initialIsOpen?: boolean;
    icon?: string;
    onClickFilter: (filter: {
        key: string;
        value: any;
    }) => void;
}): React.JSX.Element | null;
export {};
