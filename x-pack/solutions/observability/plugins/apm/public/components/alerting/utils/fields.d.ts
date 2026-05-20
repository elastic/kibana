import React from 'react';
export declare function ServiceField({ allowAll, currentValue, onChange, }: {
    allowAll?: boolean;
    currentValue?: string;
    onChange: (value?: string) => void;
}): React.JSX.Element;
export declare function EnvironmentField({ currentValue, onChange, serviceName, }: {
    currentValue: string;
    onChange: (value?: string) => void;
    serviceName?: string;
}): React.JSX.Element;
export declare function TransactionNameField({ currentValue, onChange, serviceName, }: {
    currentValue?: string;
    onChange: (value?: string) => void;
    serviceName?: string;
}): React.JSX.Element;
export declare function TransactionTypeField({ currentValue, onChange, serviceName, }: {
    currentValue?: string;
    onChange: (value?: string) => void;
    serviceName?: string;
}): React.JSX.Element;
export declare function ErrorGroupingKeyField({ currentValue, onChange, serviceName, }: {
    currentValue?: string;
    onChange: (value?: string) => void;
    serviceName?: string;
}): React.JSX.Element;
export declare function IsAboveField({ value, unit, onChange, step, }: {
    value: number;
    unit: string;
    onChange: (value: number) => void;
    step?: number;
}): React.JSX.Element;
