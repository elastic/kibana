import React from 'react';
export declare enum TreemapTypes {
    Devices = "devices",
    Versions = "versions"
}
export declare function TreemapSelect({ selectedTreemap, onChange, }: {
    selectedTreemap: TreemapTypes;
    onChange: (value: TreemapTypes) => void;
}): React.JSX.Element;
