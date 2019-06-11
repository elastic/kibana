# Integrations Manager

## Directory overview
```
x-pack/plugins/integrations_manager/
├── common 
│   ├── constants.ts        # common strings, mostly. id, paths, etc
│   └── types.ts            # as we find common types
├── index.ts                # legacy plugin definition
├── kibana.json             # new platform style shown in MIGRATION.md
├── public
│   ├── components          # plugin-specific components (used by screens/*)
│   ├── data.ts             # all client-side data fetching
│   ├── index.tsx           # React root. Client-side routes applied
│   ├── register_feature.ts # add to registry for /#/home/feature_directory
│   ├── routes.tsx          # every re: client-side routes. paths, mappings
│   └── screens             # typically a view for a client-side route
│       ├── detail.tsx      # integration detail view i.e. '/detail/:pkgkey'
│       └── home.tsx        # integration list view i.e. '/'
└── server            
    ├── index.ts            # new platform style shown in MIGRATION.md 
    ├── plugin.ts           # new platform style shown in MIGRATION.md
    ├── registry.ts         # anything registry-related
    ├── routes.ts           # every re: server-side routes. paths, mappings
    └── saved_objects.ts    # anything saved objects-related
```

## Development
### Feature development
We're using a long-running feature branch [`feature-integrations-manager`](https://github.com/elastic/kibana/tree/feature-integrations-manager). Develop new features under branches in your own fork of `elastic/kibana`, then make PR's against [`elastic:feature-integrations-manager`](https://github.com/elastic/kibana/tree/feature-integrations-manager). e.g. work in `yourname:123456-feature-description` and create a PR to merge that into `elastic:feature-integrations-manager`. See https://github.com/elastic/kibana/pull/37950 for an example

### Getting started
 1. In one shell: start the [registry service](https://github.com/elastic/integrations-registry). See [thier docs](https://github.com/elastic/integrations-registry#running) for more information.
 1. In another shell: `yarn es snapshot`
 1. In another shell: `yarn start --no-base-path` in another
 