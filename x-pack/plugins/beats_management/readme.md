# Beats CM

Notes:
Falure to have auth enabled in Kibana will make for a broken UI. UI based errors not yet in place

## Testing

### Unit tests

From `~/kibana/x-pack`, run `node scripts/jest.js plugins/beats --watch`.

### API tests

In one shell, from **~/kibana/x-pack**:
`node scripts/functional_tests-server.js`

In another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --config test/api_integration/config.ts`.

### Manual e2e testing

- Run this command to fake an enrolling beat (from beats_management dir)

```
node scripts/enroll.js <enrollment token>
```

- Run a command to setup a fake large-scale deployment
  Note: `ts-node` is required to be installed gloably from NPM/Yarn for this action

```
ts-node scripts/fake_env.ts <KIBANA BASE PATH> <# of beats> <# of tags per beat> <# of congifs per tag>
```
